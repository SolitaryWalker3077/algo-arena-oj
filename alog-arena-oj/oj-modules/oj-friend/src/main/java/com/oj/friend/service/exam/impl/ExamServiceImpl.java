package com.oj.friend.service.exam.impl;

import com.github.pagehelper.PageHelper;
import com.oj.common.entity.TableDataInfo;
import com.oj.friend.entity.exam.dto.ExamQueryDto;
import com.oj.friend.entity.exam.vo.ExamVo;
import com.oj.friend.manager.ExamCacheManager;
import com.oj.friend.mapper.exam.ExamMapper;
import com.oj.friend.service.exam.IExamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ExamServiceImpl implements IExamService {

    @Autowired
    private ExamMapper examMapper;

    @Autowired
    private ExamCacheManager examCacheManager;


    @Override
    public List<ExamVo> list(ExamQueryDto examQueryDto) {
        PageHelper.startPage(examQueryDto.getPageNum(), examQueryDto.getPageSize());
        return examMapper.selectExamList(examQueryDto);
    }

    @Override
    public TableDataInfo redisList(ExamQueryDto examQueryDto) {
        //从redis当中获取 竞赛列表的数据
        Long total = examCacheManager.getListSize(examQueryDto.getType());
        List<ExamVo> examVoList;
        if(total == null||total == 0) {
            examVoList = list(examQueryDto);
            examCacheManager.refreshCache(examQueryDto.getType());
        } else {
            examCacheManager.getExamVOList(examQueryDto);
        }
        return null;
    }
}
