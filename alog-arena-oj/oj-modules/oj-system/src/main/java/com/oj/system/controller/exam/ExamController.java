package com.oj.system.controller.exam;

import com.oj.common.controller.BaseController;
import com.oj.common.entity.TableDataInfo;
import com.oj.system.entity.exam.dto.ExamQueryDto;
import com.oj.system.service.exam.IExamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/exam")
@Tag(name = "竞赛管理接口")
public class ExamController extends BaseController {


    @Autowired
    private IExamService examService;

    //列表:接口地址: /exam/list
    @Operation(summary = "竞赛列表")
    @GetMapping("/list")
    public TableDataInfo list(@Validated ExamQueryDto examQueryDto) {
        return getDataTable(examService.list(examQueryDto));
    }

}
