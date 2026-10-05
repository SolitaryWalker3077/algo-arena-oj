package com.oj.friend.service.question.impl;

import com.oj.common.entity.TableDataInfo;
import com.oj.friend.elasticsearch.QuestionRepository;
import com.oj.friend.entity.question.QuestionInfo;
import com.oj.friend.entity.question.dto.QuestionQueryDto;
import com.oj.friend.entity.question.es.QuestionEs;
import com.oj.friend.entity.question.vo.QuestionDetailVo;
import com.oj.friend.entity.question.vo.QuestionVo;
import com.oj.friend.manager.QuestionCacheManager;
import com.oj.friend.mapper.question.QuestionMapper;
import com.oj.friend.service.question.IQuestionService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import java.util.List;
import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.collection.CollectionUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;

@Service
public class QuestionServiceImpl implements IQuestionService {

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private QuestionMapper questionMapper;

    @Autowired
    private QuestionCacheManager questionCacheManager;

    @Override
    public TableDataInfo list(QuestionQueryDto questionQueryDto) {
        long count = questionRepository.count();
        if(count <= 0) {
            refreshQuestion();
        }
        Sort sort = Sort.by(Sort.Direction.DESC, "createTime");
        Pageable pageable = PageRequest.of(questionQueryDto.getPageNum() - 1,questionQueryDto.getPageSize(),sort);
        Integer difficult = questionQueryDto.getDifficult();
        String keyword = questionQueryDto.getKeyword();
        Page<QuestionEs> questionESPage;
        if(difficult == null && StrUtil.isEmpty(keyword)) {
           questionESPage = questionRepository.findAll(pageable);
        } else if (StrUtil.isEmpty(keyword)) {
            questionESPage = questionRepository.findQuestionByDifficult(difficult,pageable);
        } else if (difficult == null) {
            questionESPage = questionRepository.findByTitleOrContent(keyword,keyword,pageable);
        } else {
            questionESPage = questionRepository.findByTitleOrContentAndDifficulty(keyword,keyword,difficult,pageable);
        }
        long total = questionESPage.getTotalElements();
        if(total <= 0) {
            return TableDataInfo.empty();
        }
        List<QuestionEs> questionESList = questionESPage.getContent();
        List<QuestionVo> questionVOList = BeanUtil.copyToList(questionESList, QuestionVo.class);
        return TableDataInfo.success(questionVOList, total);
    }

    @Override
    public QuestionDetailVo detail(Long questionId) {
        QuestionEs questionEs = questionRepository.findById(questionId).orElse(null);
        QuestionDetailVo questionDetailVo = new QuestionDetailVo();
        if(questionEs != null) {
            BeanUtil.copyProperties(questionEs,questionDetailVo);
            return questionDetailVo;
        }
        QuestionInfo questionInfo = questionMapper.selectById(questionId);
        if(questionInfo == null) {
            return null;
        }
        refreshQuestion();
        BeanUtil.copyProperties(questionInfo,questionDetailVo);
        return questionDetailVo;
    }

    @Override
    public String preQuestion(Long questionId) {
        Long listSize = questionCacheManager.getListSize();
        if(listSize == null || listSize <=0) {
            questionCacheManager.refreshCache();
        }
        return questionCacheManager.preQuestion(questionId).toString();
    }

    @Override
    public String nextQuestion(Long questionId) {
        Long listSize = questionCacheManager.getListSize();
        if(listSize == null || listSize <= 0) {
            questionCacheManager.refreshCache();
        }
        return questionCacheManager.nextQuestion(questionId).toString();
    }


    /**
     * 将数据库中的全部题目同步到 Elasticsearch，供题目列表和详情查询使用。
     * 按题目 ID 新增或覆盖索引文档，不会删除仅存在于 Elasticsearch 中的旧文档。
     */
    private void refreshQuestion() {
        // 全量查询数据库中的题目。
        List<QuestionInfo> questionInfoList = questionMapper.selectList(new LambdaQueryWrapper<QuestionInfo>());
        // 数据库中没有题目时直接返回，不执行索引写入。
        if(CollectionUtil.isEmpty(questionInfoList)) {
            return;
        }
        // 将数据库实体转换为 Elasticsearch 文档对象。
        List<QuestionEs> questionEsList = BeanUtil.copyToList(questionInfoList, QuestionEs.class);
        // 批量保存文档：相同 ID 的文档更新，不存在的文档新增。
        questionRepository.saveAll(questionEsList);
    }
}
